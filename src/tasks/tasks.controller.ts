import { Controller, HttpException, HttpStatus, Query } from '@nestjs/common';
import { Body } from '@nestjs/common/decorators';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import {
  Get,
  Post,
  Delete,
  Patch,
} from '@nestjs/common/decorators/http/request-mapping.decorator';
import { Param } from '@nestjs/common/decorators/http/route-params.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ResultStates } from '../result.dto';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTaskFilterDto } from './dto/get-tasks-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard())
export class TasksController {
  constructor(private taskService: TasksService) {}

  @Get()
  async getTasks(
    @Query() filterDto: GetTaskFilterDto,
    @GetUser() user: User,
  ): Promise<Task[]> {
    const result = await this.taskService.getTasks(filterDto, user);

    if (result.state == ResultStates.ERROR) {
      throw new HttpException(result.data.message, result.data.statusCode);
    }

    return result.data;
  }

  @Post()
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    const result = await this.taskService.createTask(createTaskDto, user);

    if (result.state == ResultStates.ERROR) {
      throw new HttpException(result.data.message, result.data.statusCode);
    }

    return result.data;
  }

  @Get('/:id')
  async getTaskById(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Task> {
    const result = await this.taskService.getTaskById(id, user);

    if (result.state == ResultStates.ERROR) {
      throw new HttpException(result.data.message, result.data.statusCode);
    }

    return result.data;
  }

  @Delete('/:id')
  async deleteTask(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    const result = await this.taskService.deleteTask(id, user);

    if (result.state == ResultStates.ERROR) {
      throw new HttpException(result.data.message, result.data.statusCode);
    }
  }

  @Patch('/:id/status')
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    if (updateTaskDto.status == undefined) {
      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    }
    const status = updateTaskDto.status;
    const result = await this.taskService.updateTaskStatus(id, status, user);

    if (result.state == ResultStates.ERROR) {
      throw new HttpException(result.data.message, result.data.statusCode);
    }

    return result.data;
  }

  @Patch('/:id/resolver')
  async updateTaskResolver(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    if (updateTaskDto.resolver == undefined) {
      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    }
    const resolver = updateTaskDto.resolver;
    const result = await this.taskService.updateTaskResolver(
      id,
      resolver,
      user,
    );

    if (result.state == ResultStates.ERROR) {
      throw new HttpException(result.data.message, result.data.statusCode);
    }

    return result.data;
  }
}
